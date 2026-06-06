---
title: "AWS Systems Manager: Operational Management"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Systems Manager: Operational Management

## Overview

Observability tells you what is happening in your environment. Systems Manager gives you the tools to act on what you observe — remotely, at scale, without opening SSH ports or distributing credentials. AWS Systems Manager (SSM) is a collection of operational management capabilities for EC2 instances, on-premises servers, and edge devices: secure shell access without SSH, fleet-wide command execution, automated OS patching, configuration management, and inventory collection.

The problem SSM solves is the operational overhead of managing servers at scale. Before SSM, managing 500 EC2 instances meant maintaining SSH keys for every operator, running a bastion host as a security boundary, writing custom scripts to execute operations across a fleet in parallel, and building compliance reports by hand. Each of those creates security risk, operational complexity, and manual effort. SSM replaces that entire pattern: Session Manager provides IAM-controlled browser-based shell access with no inbound ports open; Run Command executes scripts on thousands of instances simultaneously; Patch Manager automates OS patching with compliance reporting; Parameter Store centralizes configuration. The SSM Agent — pre-installed on Amazon Linux 2, Amazon Linux 2023, and Windows Server AMIs — enables all of this without agent deployment effort on standard AWS instances.

For the SAA exam, understand Session Manager (no SSH, IAM-controlled, audited), Run Command (fleet-scale execution), Patch Manager (baselines and maintenance windows), and Parameter Store's position within SSM. The SAP exam adds Automation documents, OpsCenter for incident management, maintenance window design, and cross-account SSM operation. After this lesson you will be able to design a secure, scalable operational management architecture for an EC2 fleet without SSH keys or bastion hosts.

---

## Core Concepts

### SSM Agent and Session Manager

The **SSM Agent** is a lightweight daemon pre-installed on most AWS-provided AMIs (Amazon Linux 2, Amazon Linux 2023, Windows Server 2016+, Ubuntu 18.04+). It communicates with the SSM service over **outbound HTTPS (port 443)** — the instance initiates the connection, so no inbound ports need to be open on the security group. To use SSM features, an instance needs: the SSM Agent running, outbound internet access (or a VPC endpoint for SSM), and an IAM instance profile with the `AmazonSSMManagedInstanceCore` managed policy.

**Session Manager** provides interactive shell access to managed instances through the AWS console, CLI, or AWS Systems Manager API — without SSH keys, bastion hosts, or open port 22. Access is governed entirely by IAM policies: you grant `ssm:StartSession` on specific instance ARNs or tags. All session activity (every keystroke and output) is logged to CloudTrail and optionally to an S3 bucket or CloudWatch Logs stream for audit purposes.

Session Manager is the recommended replacement for SSH and RDP in AWS environments. It eliminates the bastion host as an attack surface, removes the need to distribute and rotate SSH keys, and provides a complete audit trail of every command run in every session.

Session Manager also enables **port forwarding** — tunneling a remote port to a local port over the SSM session, enabling access to internal services (RDS, private HTTP APIs, Redis) without a VPN or bastion host.

---

### Run Command and Automation

**Run Command** executes scripts and SSM Documents on any number of managed instances simultaneously. You target instances by instance ID, tag, or resource group — "run this on all instances tagged `Environment=prod` and `Role=api-server`." SSM Documents define the steps to execute (shell scripts, PowerShell, Python). Run Command returns per-instance output and a success/failure status for each target.

Use Run Command for: executing one-time operational tasks across a fleet (rotating credentials, installing a software update, running a diagnostic), emergency response (removing a compromised file from all instances), and scheduled maintenance operations.

**Automation** extends Run Command with multi-step runbooks: sequences of actions with branching, approvals, cross-account operations, and wait states. An Automation document might: stop an EC2 instance → create an AMI snapshot → start the instance → validate health → notify via SNS. AWS provides pre-built Automation documents for common operations (create AMI, patch an instance, enable encryption). Automation can be triggered manually, on a schedule (Maintenance Windows), or in response to AWS Config rule violations for automatic remediation.

---

### Patch Manager

Patch Manager automates OS and application patching for EC2 instances and on-premises servers. Configuration requires three components:

**Patch Baseline**: defines which patches are approved for installation. You can filter by severity (Critical, Important, Moderate), classification (Security, BugFix), and set an auto-approval delay — the number of days after a patch is released before it is automatically approved for installation. The delay allows time for a patch to be tested in staging before it is approved for production.

**Maintenance Window**: defines when patching runs — the schedule (cron expression or rate), duration, and allowed downtime (how many instances can be patched simultaneously). Maintenance Windows can also trigger Run Command and Automation documents, making them a general-purpose scheduled operations facility.

**Targets**: the instances to patch, selected by tag, instance ID, or resource group.

After patching, Patch Manager generates **compliance reports** — per-instance patch status showing which patches are installed, which are missing, and which failed to install. These reports are available in the SSM console and can be sent to AWS Config and Security Hub for compliance auditing.

---

### OpsCenter and Inventory

**OpsCenter** is SSM's incident management feature. An **OpsItem** is a record of an operational issue — similar to a ticket. OpsItems can be created automatically from CloudWatch Alarms, EventBridge events, or GuardDuty findings, or manually by operators. Each OpsItem includes: the issue description, affected resources, related CloudWatch alarms, related SSM Automation runbooks, and resolution notes. OpsCenter provides a centralized operational console for tracking and resolving incidents across accounts.

**Inventory** collects metadata from managed instances: installed applications, OS version, patch compliance, network interfaces, Windows registry keys, running services, and more. Inventory data is stored in S3 and indexed in a managed Config aggregator. Use Inventory for software audits, license tracking, compliance reporting, and detecting unauthorized software installations across a fleet.

---

## Configuration Reference

### Setting Up Session Manager Access with IAM

```json
// IAM policy — allows starting a session only on instances tagged Team=payments
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:StartSession",
        "ssm:TerminateSession",
        "ssm:ResumeSession"
      ],
      "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/Team": "payments"   // Restrict to tagged instances
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "ssm:DescribeSessions",
      "Resource": "*"
    }
  ]
}
```

```bash
# Start a session from the CLI (no SSH key required, no bastion host)
aws ssm start-session \
  --target i-0abc1234567890def \
  --region 