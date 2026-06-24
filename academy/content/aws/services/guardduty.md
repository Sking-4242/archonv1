---
title: "Amazon GuardDuty"
type: content
estimated_minutes: 20
cert_tags: ["SCS-C03", "SOA-C03", "SAA-C03", "CLF-C02"]
---

# Amazon GuardDuty

## Overview

Amazon GuardDuty is AWS's managed threat-detection service. It continuously monitors your AWS accounts, workloads, and data for malicious or unauthorized activity and produces prioritized security findings — all without you deploying or managing any sensors on the network. This is a *service reference* lesson: it explains what GuardDuty is, how it works internally, every protection plan it offers, how to operate it across an organization, how it is priced, and what each AWS certification expects you to know about it. Cert paths that touch detection, monitoring, or incident response link here so you can learn the service once and reuse that knowledge everywhere.

The core idea behind GuardDuty is that the signals needed to detect most cloud attacks already exist in logs AWS is generating for you — API activity, network flows, and DNS lookups. Rather than ask you to build a pipeline that collects and analyzes those logs, GuardDuty consumes them directly from the AWS control plane, applies machine learning, anomaly detection, and curated threat intelligence, and surfaces only the events that look like threats. Because it reads these data sources natively, GuardDuty is **agentless** for its foundational detections: there is nothing to install on an EC2 instance for GuardDuty to notice that the instance is talking to a known cryptomining domain.

Understanding GuardDuty well means understanding three things: the data sources it analyzes, the structure and meaning of the findings it emits, and the protection plans that extend its coverage beyond the foundational data sources. Everything else — multi-account deployment, alerting, suppression — builds on those three.

---

## How It Works

GuardDuty analyzes several **foundational data sources** that it reads directly from AWS, with no configuration of the logs themselves required:

- **AWS CloudTrail management events** — the API control-plane activity in your account (who called what, from where). GuardDuty uses this independently of any CloudTrail trail you have configured; it does not require you to enable a trail.
- **VPC Flow Logs** — network connection metadata for your VPC resources. Again, GuardDuty consumes this stream directly; you do not need to enable VPC Flow Logs to a destination for GuardDuty to use the data.
- **DNS query logs** — DNS requests made through the AWS-provided Route 53 Resolver. Malware frequently reveals itself through DNS (command-and-control domains, DGA patterns), making this a high-value source.

On top of these, GuardDuty applies three analytic techniques: **machine learning models** that establish a baseline of normal behavior and flag anomalies, **anomaly detection** for unusual API and network patterns, and **integrated threat intelligence** — curated lists of known-malicious IPs and domains from AWS Security and third-party providers. The combination is what lets GuardDuty say "this instance is mining cryptocurrency" or "these credentials are being used from an unusual location" rather than just dumping raw logs.

The output of all this analysis is a **finding**. Every finding has a *finding type* using a structured naming convention — `ThreatPurpose:ResourceType/ThreatFamilyName.DetectionMechanism` — for example `CryptoCurrency:EC2/BitcoinTool.B!DNS`, `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration`, or `Recon:EC2/PortProbeUnprotectedPort`. Each finding carries a **severity** on a 0.1–8.9 scale bucketed into Low, Medium, and High, the **affected resource**, the **actors** involved (IP addresses, ports, domains), and a timeline. Findings are the unit you alert on, investigate, and automate against.

---

## Key Features: Protection Plans

The foundational data sources cover a lot, but GuardDuty extends its reach through optional **protection plans**, each adding a new data source or analysis. Knowing which plan detects which threat is the single most exam-relevant fact about GuardDuty:

- **S3 Protection** — analyzes CloudTrail S3 *data events* to detect threats to data in S3, such as anomalous access patterns or access from suspicious locations. (Distinct from the management events analyzed by default.)
- **EKS Protection** — analyzes Amazon EKS audit logs to detect suspicious Kubernetes activity, such as use of the API by anonymous users or privileged-container creation.
- **Runtime Monitoring** — uses a lightweight **GuardDuty agent** (deployed on EC2, or as an add-on for EKS, or for ECS-on-Fargate) to observe operating-system-level behavior — process execution, file access, and network activity from *inside* the workload. This is the one capability that is not agentless, and it provides the deepest runtime visibility.
- **Malware Protection for EC2** — when a finding suggests a compromised EC2 instance, GuardDuty performs an **agentless** scan of the instance's EBS volumes (using a snapshot) to confirm the presence of malware, without touching the running workload.
- **Malware Protection for S3** — scans newly uploaded S3 objects for malware so you can quarantine or tag infected files before they spread.
- **RDS Protection** — analyzes login activity to Amazon Aurora databases to detect anomalous or suspicious sign-in behavior.
- **Lambda Protection** — monitors network activity from Lambda functions for signs of compromise, such as communication with known-malicious infrastructure.

A useful mental model: the *foundational* sources answer "is something wrong at the account/network level?"; the *protection plans* answer "is something wrong specifically in my S3 / EKS / runtime / database / Lambda / files?" When a scenario asks "how do you detect malware on an EC2 instance" or "how do you detect threats to data stored in S3," the answer is almost always a specific protection plan.

---

## Configuration Reference

Enabling GuardDuty is deliberately simple — a single click or API call (`CreateDetector`) per Region creates a **detector**, the regional container for GuardDuty configuration. Important configuration concepts:

- **Regional service.** GuardDuty is enabled per AWS Region. A detector in `us-east-1` does not see activity in `eu-west-1`. For full coverage you enable it in every Region you use (and ideally all Regions to catch activity in unused ones).
- **Protection plans** are toggled per detector. New foundational features are typically on by default for new detectors; protection plans like Runtime Monitoring or RDS Protection are opt-in.
- **Trusted IP lists and threat lists.** You can upload a *trusted IP list* (addresses GuardDuty will not alert on) and custom *threat lists* (additional known-bad addresses to alert on), giving you tunable allow/deny intelligence on top of AWS's built-in feeds.
- **Suppression rules.** Filters that automatically archive findings matching criteria you do not care about (for example a known benign scanner), reducing noise without disabling detection.
- **Sample findings.** GuardDuty can generate sample findings so you can test downstream alerting and automation before a real threat appears.

---

## Operations and Troubleshooting

Once enabled, GuardDuty runs continuously with no tuning required, but operating it well involves a few patterns:

- **Routing findings.** Every finding is published to **Amazon EventBridge** in near real time. This is the backbone of alerting and automated response: an EventBridge rule can match on finding type or severity and trigger an SNS notification, a Lambda remediation, or a Step Functions workflow.
- **Exporting findings.** Findings can be exported to an S3 bucket (with KMS encryption) for long-term retention and offline analysis, and are also published to AWS Security Hub for aggregation.
- **Investigation.** A GuardDuty finding tells you *that* something happened; **Amazon Detective** (built from the same data sources) helps you understand *how* and *how far* by building a behavior graph. GuardDuty integrates a one-click pivot to Detective.
- **Reducing noise.** If you are drowning in low-value findings, the answer is suppression rules and trusted IP lists — not disabling the feature. If an expected finding never appears, check that the relevant protection plan is enabled, that the detector exists in the right Region, and that the workload actually generates the data source (for example, Runtime Monitoring requires the agent to be deployed and healthy).

---

## Integrations

GuardDuty is a producer in the AWS security ecosystem. It sends findings to **Security Hub** (which aggregates them with findings from Inspector, Macie, and others and scores your posture), pivots to **Detective** for investigation, and emits to **EventBridge** for automated response. It is centrally managed through **AWS Organizations** via a **delegated administrator** account, and its findings can flow into **Amazon Security Lake** (normalized to the OCSF schema) for SIEM consumption. In a well-designed environment, GuardDuty is the detection engine, Security Hub is the aggregation pane, Detective is the investigation tool, and EventBridge is the automation trigger.

For multi-account organizations, the standard pattern is to designate a **delegated administrator** (usually a dedicated security account), enable GuardDuty across the organization, and turn on **auto-enable for new accounts** so that every account created in the future is protected automatically. This avoids the failure mode of detection being enabled account-by-account and findings being stranded where no one looks.

---

## Pricing and Cost Considerations

GuardDuty pricing is **usage-based** with no upfront cost and no flat fee — you pay for the volume of data analyzed. The main cost drivers are the quantity of CloudTrail management events analyzed, the gigabytes of VPC Flow Logs and DNS logs processed, and the volume associated with each protection plan (S3 data events, EKS audit logs, Runtime Monitoring hours, malware scan GB, and so on). Because pricing scales with activity, costs grow with account size and traffic. A standard **30-day free trial** lets you see your projected cost before committing, and the GuardDuty console provides usage and cost estimates per data source so you can decide which protection plans are worth enabling. Exact per-unit prices vary by Region and change over time, so treat cost as "proportional to the data sources you enable and your activity volume" rather than a fixed number.

---

## Exam Relevance

**CLF-C02 (Cloud Practitioner):** Know GuardDuty as *the* intelligent threat-detection service that continuously monitors for malicious activity — agentless, finding-based, and distinct from Inspector (vulnerability scanning) and Macie (sensitive-data discovery). Foundational depth: what it is and when you'd reach for it.

**SAA-C03 (Solutions Architect Associate):** Know that GuardDuty provides threat detection from CloudTrail, VPC Flow Logs, and DNS logs without agents, and that findings integrate with EventBridge and Security Hub for alerting and automated response. Architecture-level: where it fits in a secure design.

**SOA-C03 (CloudOps):** Know how to operationalize GuardDuty — routing findings through EventBridge to SNS/Lambda for automated notification and remediation, and aggregating across accounts. Operations depth.

**SCS-C03 (Security Specialty):** Deepest level. Know every protection plan and exactly which threat each detects; the delegated-administrator and auto-enable organization model; suppression rules and trusted/threat lists; the agentless-vs-Runtime-Monitoring distinction; and the GuardDuty → Detective → Security Hub → Security Lake pipeline. Expect scenario questions of the form "which detection capability do you enable to catch X across N accounts."

---

## Summary

Amazon GuardDuty is a managed, agentless threat-detection service that analyzes CloudTrail management events, VPC Flow Logs, and DNS logs using machine learning, anomaly detection, and threat intelligence, emitting prioritized findings. Optional protection plans extend it to S3 data, EKS audit logs, OS-level runtime behavior (the one agent-based capability), agentless EC2 malware scanning, S3 object malware scanning, Aurora login activity, and Lambda network activity. Findings flow through EventBridge to alerting and automated remediation, pivot to Detective for investigation, and aggregate in Security Hub. Across an organization, a delegated administrator with auto-enable ensures every account is covered. Pricing is usage-based per data source. The exam-critical skill is mapping a described threat to the specific GuardDuty capability that detects it and deploying that capability organization-wide.

---

## Quick Check

1. Which three foundational data sources does GuardDuty analyze without requiring you to enable any logs yourself?
2. A scenario requires detecting malware on a potentially compromised EC2 instance without disturbing the running workload. Which GuardDuty capability applies, and is it agent-based or agentless?
3. What is the difference between GuardDuty S3 Protection and the management-event analysis GuardDuty does by default?
4. How do you ensure every account in a 50-account organization — including accounts created next year — has GuardDuty enabled?
5. A finding has fired. Which service do you pivot to in order to understand the scope and root cause, and which service routes the finding to an automated response?

---

## What's Next

Pair this with the **AWS Security Hub** service lesson (aggregating GuardDuty findings with the rest of your posture) and **Amazon Macie** (sensitive-data discovery in S3). In the SCS-C03 path, this lesson supports the Detection domain lessons on security monitoring and threat detection; in the SOA-C03 path it supports the automation and remediation lessons.
