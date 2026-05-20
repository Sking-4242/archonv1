---
title: "AWS Systems Manager: Operational Management"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# AWS Systems Manager: Operational Management

## Overview

AWS Systems Manager (SSM) is a collection of operational management tools for EC2 instances, on-premises servers, and edge devices. It enables remote command execution, patch management, configuration management, and inventory without opening SSH ports or managing bastion hosts.

## SSM Agent and Session Manager

The SSM Agent runs on EC2 instances (pre-installed on Amazon Linux 2, Windows Server AMIs) and enables all SSM features without opening port 22 or 3389. Session Manager provides browser-based or CLI shell access to instances without SSH keys, bastion hosts, or open inbound ports. Access is controlled by IAM; all session activity is logged to CloudTrail and optionally to S3 or CloudWatch Logs. This is the recommended replacement for SSH/RDP in AWS environments.

## Run Command and Automation

Run Command executes scripts or SSM Documents on any number of instances simultaneously (filtered by tag, instance ID, or resource group). Use for: applying OS patches, installing software, rotating credentials, running diagnostics across a fleet. Automation runs multi-step operational runbooks defined as SSM Automation documents — useful for complex procedures like creating AMI backups, patching with pre/post validation, or cross-account operations. Automation is triggered manually, on a schedule, or in response to Config rules.

## Patch Manager

Patch Manager automates the process of patching OS and application software on EC2 and on-premises servers. Define a Patch Baseline (which patches to apply — by severity, classification, auto-approval delay), a Maintenance Window (when patching runs), and target instances (by tag). Patch Manager reports compliance — which instances are patched and which have missing patches. Critical for meeting compliance requirements (SOC2, PCI, HIPAA) that require timely patching.

## Parameter Store and Inventory

Parameter Store (covered in the secrets lesson) is part of Systems Manager. SSM Inventory collects metadata from managed instances: installed applications, OS details, network configuration, Windows registry keys. Inventory data is stored in S3 and queryable in the SSM console or via AWS Config. Use Inventory for: software audit, license tracking, and detecting unauthorized software installations.

## Summary

Systems Manager enables agent-based operational management of EC2 and hybrid servers without SSH access. Session Manager replaces SSH/RDP with IAM-controlled browser sessions with full audit logging. Run Command and Automation execute operations at fleet scale. Patch Manager automates compliance patching. SSM is the operational backbone for well-managed AWS server fleets.

## What's Next

Next up: the Module 16 Canvas Labs — designing an observability architecture.