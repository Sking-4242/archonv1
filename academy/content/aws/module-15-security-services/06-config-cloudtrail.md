---
title: "AWS Config and CloudTrail"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# AWS Config and CloudTrail

## Overview

AWS Config tracks the configuration state of your AWS resources over time and evaluates compliance against rules. CloudTrail records every API call made to your AWS account. Together they answer two critical questions: 'What changed and when?' (Config) and 'Who did it?' (CloudTrail).

## AWS CloudTrail

CloudTrail captures every AWS API call — from the console, SDK, CLI, or AWS services — as an event with: who made the call (IAM ARN), when, from where (IP address), what service and action, what resource, and the result. Management events (control plane: create, modify, delete) are enabled by default and stored for 90 days in the CloudTrail Event History. Enable a Trail to store events in S3 for longer retention, query with Athena, or stream to CloudWatch Logs for alerting. Data events (S3 object reads/writes, Lambda invocations) must be explicitly enabled — they generate high volume and cost.

## CloudTrail Integrity

CloudTrail log files can be validated with log file integrity verification — each log file has a digest file with SHA-256 hashes. If a log file is modified or deleted, validation fails. Enable this for forensically reliable audit trails. Store Trail logs in a dedicated security account with S3 Object Lock to prevent tampering even by account administrators.

## AWS Config

Config continuously records the configuration state of supported resources (EC2, S3, IAM, VPC, RDS, etc.) and stores configuration history in S3. You can query the configuration of any resource at any point in the retention period. Config Rules evaluate resources against compliance rules: `ec2-instance-no-public-ip`, `s3-bucket-server-side-encryption-enabled`, `iam-root-access-key-check`. Rules can be AWS managed (100+ available) or custom Lambda-backed. Conformance Packs bundle multiple rules for a compliance framework (CIS, NIST, PCI).

## Config Remediation

When Config detects a non-compliant resource, it can trigger automatic remediation via Systems Manager Automation documents. Example: a Config rule finds an S3 bucket with public access enabled → SSM Automation runs `EnableS3BucketBlockPublicAccess` automatically. This closes the loop from detection to remediation without human intervention. Remediation can also just notify via SNS if automatic action is too aggressive.

## Summary

CloudTrail answers 'who did what and when' for every API call in your account. Config answers 'what is the current and historical configuration of my resources' and 'are they compliant?' Enable both at the Organization level with a centralized Log Archive account. Enable CloudTrail log file integrity verification. Use Config rules for continuous compliance monitoring with automated or manual remediation.

## What's Next

Next up: the Module 15 Security Canvas Labs — spot the gaps and design the fixes.