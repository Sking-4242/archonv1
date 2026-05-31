---
title: "GuardDuty and AWS Security Hub"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# GuardDuty and AWS Security Hub

## Overview

AWS GuardDuty is a managed threat detection service that continuously analyzes CloudTrail, VPC Flow Logs, DNS logs, and other sources for malicious activity. Security Hub aggregates findings from GuardDuty, Macie, Inspector, and other services into a single dashboard with compliance checks.

## Amazon GuardDuty

GuardDuty uses threat intelligence (AWS curated + third-party), machine learning, and anomaly detection to identify threats: compromised EC2 instances communicating with known C2 servers, credential exfiltration (API calls from unusual locations or TOR exit nodes), cryptocurrency mining, S3 data exfiltration, unusual IAM activity, and container escape attempts. Enable GuardDuty with one click — it reads CloudTrail and Flow Logs without any agent installation. Findings are severity-rated and can trigger EventBridge rules for automated remediation.

## GuardDuty Automated Response

GuardDuty findings → EventBridge → Lambda for automated response. Example: GuardDuty detects an EC2 instance contacting a known C2 domain → Lambda isolates the instance by replacing its security group with a deny-all group → SNS notifies the security team. This automated response reduces mean time to containment. GuardDuty also integrates with AWS Security Incident Response for managed incident workflow.

## AWS Security Hub

Security Hub aggregates security findings from GuardDuty, Macie, Inspector, Firewall Manager, IAM Access Analyzer, and third-party tools into a single pane of glass. It runs compliance checks against AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark, and PCI DSS. Each check produces a pass/fail finding with remediation guidance. Security Hub normalizes findings using ASFF (Amazon Security Finding Format) for consistent cross-tool correlation.

## AWS Inspector

Inspector is an automated vulnerability management service for EC2 instances, Lambda functions, and container images. It continuously scans for OS package vulnerabilities (CVEs), network reachability issues, and Lambda function code vulnerabilities. Inspector integrates with ECR — images are scanned on push and findings appear in Security Hub. Unlike the legacy Inspector Classic (agent-based), Inspector v2 is agentless for EC2 (uses SSM) and requires no configuration once enabled.

## Summary

GuardDuty provides continuous threat detection across CloudTrail, Flow Logs, and DNS without agents or configuration. Automate remediation with EventBridge + Lambda. Security Hub centralizes findings and compliance checks across GuardDuty, Macie, Inspector, and more. Enable GuardDuty and Security Hub in every account at the Organization level — it's operational security hygiene.

## Examples

A gaming company notices unusual behavior: one of their EC2 instances running game servers begins making outbound DNS queries to domains associated with a known botnet command-and-control network. The security team is alerted by a GuardDuty finding — `Backdoor:EC2/C&CActivity.B` — within minutes of the first suspicious query. An EventBridge rule triggers a Lambda function that replaces the instance's security group with a deny-all isolation group and creates a snapshot of the instance for forensic analysis. The entire response takes under two minutes with no human intervention required.

A mid-market retail company running 12 AWS accounts has security findings scattered across GuardDuty, Macie, and Inspector in each account — no one has a consolidated view of which accounts are most at risk. After enabling Security Hub at the Organization level with a delegated administrator account, the CISO gets a single dashboard showing all findings normalized to ASFF, color-coded by severity, with CIS AWS Foundations Benchmark scores per account. For the first time, the security team can prioritize remediation effort across the entire estate rather than logging into each account individually.

A fintech company runs containerized services on EKS and stores container images in ECR. After integrating Inspector v2 with ECR, every image push triggers an automatic vulnerability scan. A developer pushes a new version of the payments service image that includes a dependency with a critical CVE (CVSS 9.8). Inspector generates a finding within 90 seconds, which surfaces in Security Hub and triggers a Slack alert to the team. The image is blocked from deployment by a CodePipeline quality gate that checks for critical Inspector findings before promoting to production — the vulnerability never reaches a running container.

## Think About It

1. GuardDuty analyzes CloudTrail, VPC Flow Logs, and DNS logs without requiring any agents. What categories of threats would GuardDuty be unable to detect because of this design, and what other tools would you layer in to cover those gaps?
2. Why is it important to enable GuardDuty at the AWS Organizations level with a delegated administrator, rather than enabling it independently in each account? What attack scenario does centralized management specifically prevent?
3. Security Hub runs compliance checks against CIS AWS Foundations Benchmark and reports pass/fail. If your account fails 40% of CIS checks, how would you prioritize remediation, and what factors other than check severity would influence your approach?
4. GuardDuty can detect an EC2 instance communicating with a known malicious IP. What actions would you take before simply terminating the instance, and why does the order of those actions matter for forensics?
5. Inspector scans for CVEs in OS packages and Lambda function dependencies. What types of application-layer vulnerabilities would Inspector not catch, and what would you use instead?

## Quick Check

**Q1.** What data sources does GuardDuty analyze by default when enabled? (Choose the best answer)

- A) CloudWatch metrics, S3 access logs, and EC2 instance memory
- B) CloudTrail management events, VPC Flow Logs, and DNS query logs
- C) Config rules, CloudTrail data events, and WAF logs
- D) Inspector findings, Macie findings, and CloudTrail management events

**Answer: B** — GuardDuty's core data sources are CloudTrail management events, VPC Flow Logs, and Route 53 DNS query logs; no agents or additional configuration are required to start analyzing these.

**Q2.** Which format does Security Hub use to normalize findings from multiple security services?

- A) CloudWatch Events JSON
- B) OCSF (Open Cybersecurity Schema Framework)
- C) ASFF (Amazon Security Finding Format)
- D) STIX/TAXII

**Answer: C** — Security Hub normalizes findings from GuardDuty, Macie, Inspector, and third-party tools into ASFF, enabling consistent cross-tool correlation and automated workflows.

**Q3.** A GuardDuty finding indicates an EC2 instance is communicating with a known cryptocurrency mining pool. Which automated response pattern is considered best practice?

- A) Immediately terminate the instance to stop the threat
- B) Send an SNS email to the security team and wait for manual review
- C) Use EventBridge to trigger a Lambda that isolates the instance with a deny-all security group and notifies the security team
- D) Enable AWS Shield Advanced to block the outbound traffic

**Answer: C** — The GuardDuty → EventBridge → Lambda pattern enables automated isolation that preserves the instance for forensics while stopping the threat, faster than manual response and without destroying evidence.

## What's Next

Next up: AWS Config and CloudTrail — compliance auditing and API activity logging.