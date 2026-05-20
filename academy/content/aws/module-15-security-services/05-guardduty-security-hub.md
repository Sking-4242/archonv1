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

## What's Next

Next up: AWS Config and CloudTrail — compliance auditing and API activity logging.